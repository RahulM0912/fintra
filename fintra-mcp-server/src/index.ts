import { server } from "./server.js";
import { McpServerTools } from "./controllers/tools.js";

const mcpServerTool = new McpServerTools();
server.addTool(mcpServerTool.getTableSchemaDescriptionTool());
server.addTool(mcpServerTool.getTableColumnsDescriptionTool());
server.addTool(mcpServerTool.getQueryTool());


server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
  },
});