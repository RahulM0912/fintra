import { z } from "zod";
import pool from "../utlis/db.js";
import { readFileSync } from "fs";
import { join } from "path";


const getTableDescription = () => {
  try {
    const filePath = join(process.cwd(), 'src', 'data', 'tableDescriptions.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading table descriptions:', error);
    return {};
  }
}

const getTableColumnsDescription = () => {
  try {
    const filePath = join(process.cwd(), 'src', 'data', 'columnDescriptions.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading column descriptions:', error);
    return {};
  }
}

export class McpServerTools {

  getTableSchemaDescriptionTool() {
    return {
      name: "tableSchemaDescription",
      description: "Returns the description and columns name of some of the tables from tableSchema use this while querying database for better results",
      execute: async () => {
        const tableDescriptions = getTableDescription();
        return JSON.stringify(tableDescriptions, null, 2);
      }
    };
  }

  getTableColumnsDescriptionTool() {
    return {
      name: "tableColumnsDescription",
      description: "Returns the available description of some of the columns from tableSchema use this while querying database for better results here tableName is name of the table",
      parameters: z.object({
        tableName: z.string(),
      }),
      execute: async (args: { tableName: string }) => {
        const tableName = args.tableName;
        if(tableName) {
          const tableColumnsDescription = getTableColumnsDescription();
          const tableColumn = tableColumnsDescription[tableName as keyof typeof tableColumnsDescription];
          
          if (tableColumn) {
            return JSON.stringify(tableColumn, null, 2);
          } else {
            return `No column descriptions found for table: ${tableName}`;
          }
        }
        else return "Please provide valid table name";
      }
    };
  }

  getQueryTool() {
    return {
      name: "query",
      description: "Execute SQL queries on the PostgreSQL database",
      parameters: z.object({
        sql: z.string(),
      }),
      execute: async (arg: { sql: string }) => {
        try {
          console.log("Executing SQL:", arg.sql);
          const result = await pool.query(arg.sql);
          return String(JSON.stringify(result.rows, null, 2));
        } catch (e) {
          return String("Error");
        }
      },
    }
  }
}