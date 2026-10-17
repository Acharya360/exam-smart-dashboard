import 'dotenv/config';
import {openSqlBridge} from './sql-bridge.mjs';
const bridge=await openSqlBridge();
try{console.log(JSON.stringify((await bridge.execute("SELECT t.name table_name,c.name column_name,ty.name type_name,c.max_length,c.precision,c.scale,c.is_nullable,c.is_identity FROM sys.tables t JOIN sys.columns c ON t.object_id=c.object_id JOIN sys.types ty ON c.user_type_id=ty.user_type_id WHERE SCHEMA_NAME(t.schema_id)='dbo' ORDER BY t.name,c.column_id")).data));}finally{bridge.close();}
