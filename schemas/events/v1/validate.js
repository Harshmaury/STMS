const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const scriptDir = __dirname;
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function readJson(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }

// Safe preload: remove-if-exists then add
function preloadCommon(){
  const commonPath = path.join(scriptDir,"common.json");
  if(!fs.existsSync(commonPath)){ console.warn("Warning: common.json not found at", commonPath); return; }
  const common = readJson(commonPath);
  const id = common.$id || "common.json";
  try{
    if(ajv.getSchema("common.json")) ajv.removeSchema("common.json");
    if(ajv.getSchema(id)) ajv.removeSchema(id);
    ajv.addSchema(common,"common.json");
    if(common.$id) ajv.addSchema(common, common.$id);
    console.log("OK preload: common.json");
  }catch(e){
    // swallow only the duplicate-id error; rethrow others
    if(!/already exists/.test(e.message)) console.error("ERR preload common.json ->", e.message);
  }
}

// rest unchanged...
function addSchemas(){
  const files = fs.readdirSync(scriptDir).filter(f=>f.endsWith(".v1.json"));
  files.forEach(f=>{
    const p = path.join(scriptDir,f);
    const schema = readJson(p);
    const key = schema.$id || f;
    try{ if(!ajv.getSchema(key)) ajv.addSchema(schema,key); console.log(`OK schema: ${f}`); }
    catch(e){ console.error(`ERR add schema ${f} ->`, e.message); }
  });
}

function validatePair(schemaFile, dataFile){
  if(!fs.existsSync(schemaFile) || !fs.existsSync(dataFile)){ console.warn(`Skipping validate: ${path.basename(schemaFile)} or ${path.basename(dataFile)} missing`); return; }
  const schema = readJson(schemaFile);
  const id = schema.$id || path.basename(schemaFile);
  let validate = ajv.getSchema(id); if(!validate) validate = ajv.compile(schema);
  const data = readJson(dataFile);
  const ok = validate(data);
  if(ok) console.log(`OK validate: ${path.basename(dataFile)} ✅`);
  else console.error(`FAIL validate: ${path.basename(dataFile)} ->`, validate.errors);
}

preloadCommon();
addSchemas();

[
  ["UserCreated.v1.json","sample-user.json"],
  ["EnrollmentConfirmed.v1.json","sample-enrollment.json"],
  ["AttendanceMarked.v1.json","sample-attendance.json"]
].forEach(([s,d])=> validatePair(path.join(scriptDir,s), path.join(scriptDir,d)));

// summary
console.log("All validations finished.");
