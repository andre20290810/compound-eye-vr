'use strict';
// Validate an exported editor preset and install it as the public Pages default.
// This command never commits, pushes, stores credentials, or changes the skeleton.
const fs=require('node:fs'),path=require('node:path'),A=require('../appearance-v58.js');
function main(argv){
 const args=argv.filter(x=>x!=='--check');if(args.length!==1)throw Error('Usage: node tools/apply-appearance-preset.cjs <preset.json> [--check]');
 const input=path.resolve(args[0]),stat=fs.statSync(input);if(stat.size>65536)throw Error('Preset exceeds 64KB');
 const preset=A.validate(JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,'')));
 if(argv.includes('--check')){console.log('VALID',preset.schema,preset.revision);return;}
 preset.revision='appearance-'+new Date().toISOString();
 const destination=path.resolve(__dirname,'../public-appearance.json');fs.writeFileSync(destination,JSON.stringify(preset,null,2)+'\n');
 console.log('Updated public-appearance.json. Review and commit that file to publish the selected colors.');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={main};
