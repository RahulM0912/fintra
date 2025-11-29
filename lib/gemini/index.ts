import { Client } from "@modelcontextprotocol/sdk/client"; 
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {GoogleGenAI, mcpToTool} from '@google/genai';
import { conversationManager } from "../mcp/conversationManager";
import { ProcessQueryResult } from "../types";

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

const mcpClient = new Client(
  {
    name: "text-client",
    version: "1.0.0",
  }
)

const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:8080/mcp"),
)

let mcpConnected = false;

async function ensureMcpConnected() {
  if (!mcpConnected) {
    await mcpClient.connect(transport);
    mcpConnected = true;
  }
}

export async function processQuery(
  query: string,
  chatId: string,
  userId: string,
  modelKey?: string
): Promise<ProcessQueryResult> {

  await ensureMcpConnected();

  if(!modelKey) {
    modelKey = 'models/gemini-2.5-flash'
  }

  const messages = await conversationManager.buildMessages(query, chatId, userId);
  try {
    const response = await ai.models.generateContent({
      model: 'models/gemini-2.5-flash',
      contents: messages.map(m => m.content),
      config: {
        tools: [mcpToTool(mcpClient)],
        systemInstruction: getDataSystemInstruction(userId),
        temperature: 0,
      },
    })

    if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          console.log('No response from Gemini LLM');
          return {
            success: false,
            aiResponse: null,
            visualData: null,
            defaultVisualization: null,
            completionReason: 'error'
          }
    }

    const formattedResponse = await ai.models.generateContent({
      model: modelKey,
      contents: [`LLM RESPONSE: ${response.candidates[0].content.parts[0].text}`, `User Query: ${query}`],
      config: {
      systemInstruction: getResponseFormatSystemInstruction(),
      responseMimeType: 'application/json',
      responseSchema: getResponseJsonSchema(),
      thinkingConfig: {
            thinkingBudget: 0,
        },
      temperature: 0.1
      }
    }); 

    if (!formattedResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log('No formatted response from Gemini LLM');
        return {
          success: false,
          aiResponse: null,
          visualData: null,
          defaultVisualization: null,
          completionReason: 'error'
        }
    }


    await conversationManager.addQAPair(
        chatId,
        userId,
        query,
        formattedResponse.candidates[0].content.parts[0].text,
        modelKey,
    );

    const jsonResponse = extractJsonFromLLMResponseString(formattedResponse.candidates[0].content.parts[0].text);

    if(jsonResponse) {
      console.log('Query Processing Completed');
      return {
        success: true,
        aiResponse: jsonResponse.aiResponse ?? null,
        visualData: jsonResponse.visualData ?? null,
        defaultVisualization: jsonResponse.defaultVisualization ?? null,
        completionReason: 'stop'
      };
    } else {
      console.log('LLM response is not valid JSON');
      console.log('Query Processing Completed');
      return {
        success: true,
        aiResponse: formattedResponse.candidates[0].content.parts[0].text ?? null,
        visualData: null,
        defaultVisualization: null,
        completionReason: 'stop'
      };
    }


  } catch(error) {
    console.log('Error processing query', { 
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      success: false,
      aiResponse: '',
      visualData: null,
      defaultVisualization: null,
      completionReason: 'error'
    };
  }

}


function getDataSystemInstruction(userId: string): string {
        return ` 
You are an expert SQL assistant. Generate SQL query and use Query tool to fetch data to answer user questions. Use other tools for schema info.
Important rules:
- This is the most important rule Always Use user_id -> ${userId} to get the user specific data and dont get the data of other users
- Use proper tool to get data source schema info
- For any data, use Query tool. Never create dummy data yourself
- Pass single SQL query to Query tool
- Only SELECT and ADD queries are allowed, no updates
- Always check for exact value using ilike before querying the column or applying where clause
- Instead of fetching raw data and doing aggregation yourself, always use aggregation queries to get summarized data for final user response
- Unless asked for all values, use binning or limiting techniques in sql queries for high cardinality columns
- Return data in compressed format (Toon) (not for humans, for LLM parsing)
- Do not summarize or compromise on information while compressing the fetched data
- For data visualization or summary requests (if any), include multiple data tables (if required)
`;
}

function getResponseFormatSystemInstruction(): string {
        return `Transform the LLM response into structured JSON. Rules:
- aiResponse: 3-4 bullet summary for user (required)
- visualData: include when data visualization needed or summary
- defaultVisualization: HTML fallback when graphs not supported`;
}

function getResponseJsonSchema(): any {
        return {
            type: 'object',
            properties: {
                aiResponse: { type: 'string' },
                visualData: { 
                    type: 'array', 
                    description: 'Array of visualization objects when user requests data visualization and Summary',
                    items: { 
                        type: 'object',
                        properties: {
                            graphTypes: { 
                                type: 'array',
                                items: { type: 'string', enum: ['bar', 'pie', 'line', 'scatter', 'table', 'grouped-bar', 'stacked-bar', ] }
                            },
                            defaultType: { type: 'string', enum: ['bar', 'pie', 'line', 'scatter', 'table', 'grouped-bar', 'stacked-bar', ] },
                            graphs: { 
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    labels: { 
                                      type: 'array',
                                      items: { type: 'string' }
                                    },

                                    data: { 
                                      type: 'array',
                                      items: { type: 'number' } // or string if needed
                                    },
                                    groupBy: { type: 'string' },
                                    onHover: { type: 'string' }
                                },
                                required: ['title', 'labels', 'data']
                            },
                            tableData: { 
                                type: 'array',
                                items: {}
                            }
                        },
                        required: ['graphTypes', 'defaultType', 'graphs', 'tableData']
                    }
                },
                defaultVisualization: { type: 'string', description: 'html string when visualData doesn\'t have compatible required graph type to show the visualization'}
            },
            required: ['aiResponse']
        };
}

function extractJsonFromLLMResponseString(response: string | undefined): { aiResponse: string, summaryResponse: any, visualData: any, defaultVisualization: any } | null {
        if (!response || typeof response !== 'string') {
            console.log('Invalid response type for JSON extraction');
            return null; 
        }
        
        // Remove any markdown code block formatting
        let cleanResponse = response.replace(/```json\s*/, '').replace(/```\s*$/, '');
        
        // Try to find JSON object boundaries
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
            console.log('No valid JSON object boundaries found');
            return null;
        }
        
        const jsonString = cleanResponse.substring(jsonStart, jsonEnd + 1);
        
        try {
            const parsed = JSON.parse(jsonString);
        
            // Validate that the response has the expected structure
            if (typeof parsed !== 'object' || parsed === null) {
            console.log('Parsed JSON is not an object');
            return null;
            }
        
            // Ensure aiResponse is present and is a string
            if (!parsed.aiResponse || typeof parsed.aiResponse !== 'string') {
            console.log('Missing or invalid aiResponse in parsed JSON');
            return null;
            }
        
            // Set default values for missing optional fields
            const normalizedResponse = {
                aiResponse: parsed.aiResponse,
                summaryResponse: parsed.summaryResponse || null,
                visualData: parsed.visualData || null,
                defaultVisualization: parsed.defaultVisualization || null
            };
        
            console.log('Successfully parsed and validated JSON response');
            return normalizedResponse;
        
        } catch (error) {
            console.log('Failed to parse JSON from LLM response', {
            error: error instanceof Error ? error.message : String(error),
            jsonString: jsonString.substring(0, 200) + (jsonString.length > 200 ? '...' : '')
            });
            return null;
        }
    }