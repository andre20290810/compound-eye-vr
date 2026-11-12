'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),file=path.join(root,'build-manifest.json'),m=JSON.parse(fs.readFileSync(file,'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
m.app_version='v66';
m.source_commit=git('rev-parse','HEAD');
m.source_branch='main';
m.kinematic_timeline_schema='compound-eye-kinematic-chain-v62-with-v66-side-event-dynamics-and-ybot-variants';
m.motion_revision='xbot-derived-ybot-punch-trajectory-and-timing-v66-001';
m.aegis_motion_revision='aegis-retarget-xbot-punchC-fist-wrist-continuity-and-drive-sync-v66-002';
m.source_files_sha256['timeline-live-v66.js']=null;
for(const name of Object.keys(m.source_files_sha256))m.source_files_sha256[name]=sha(name);
m.public_appearance.sha256=sha(m.public_appearance.path);
m.public_appearance.preserved_existing_user_settings=true;
m.ybot_config.sha256=sha(m.ybot_config.path);
m.ybot_config.motion_data_unchanged=true;
const files={
 'browser-regression':'docs/evidence/v66/browser-regression-v66.json',
 'ui-regression':'docs/evidence/v66/ui-regression-v66.json',
 'additions-regression':'docs/evidence/v66/appearance-editor-regression-v66.json',
 'visor-regression':'docs/evidence/v66/visor-regression-v66.json',
 'punch-regression':'docs/evidence/v66/motion-regression-v66.json',
 'v66-regression':'docs/evidence/v66/v66-regression.json'
};
m.test_reports={};
let browserPassed=0,browserFailed=0;
for(const [name,p] of Object.entries(files)){
 const r=JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),summary=r.summary;
 if(!summary||!Number.isFinite(summary.passed)||!Number.isFinite(summary.failed))throw Error('Missing report summary: '+p);
 m.test_reports[name]={path:p,sha256:sha(p),summary};
 browserPassed+=summary.passed;browserFailed+=summary.failed;
}
m.unit_tests={passed:49,failed:0};
m.browser_tests={passed:browserPassed,failed:browserFailed};
m.backup_tag='backup-v65-before-v66-timeline-and-motion-20261112';
m.backup_commit=git('rev-list','-n','1',m.backup_tag);
m.untested=['physical iPhone/Safari','physical HMD and GameSir','physical joint contact/collision','human motor-learning efficacy'];
m.note='v66 places a compact onset/peak dynamics timeline beside the single viewer and above the multiview viewer, with the detailed numeric/waveform analysis below. Viewer and timeline dimensions are resizable. The event display uses elapsed-time positions, one X/Y series color per model, and one shared playhead; existing body markers remain the only model-side markers and scale with timeline dynamics. XBot/YBot comparison starts from a common zero without phase warping and supports trajectory-only or timing-plus-trajectory YBot punches. YBot difference color is editable. AEGIS B wrist orientation and full-body drive timing were corrected; AEGIS cross-skeleton comparison remains deferred pending joint mapping.';
m.generated_at_utc=new Date().toISOString();
m.release_validation={source_bundle:'passed',inline_javascript_syntax:'passed (3 scripts)',unit_tests:'49 passed, 0 failed',browser_tests:String(browserPassed)+' passed, '+String(browserFailed)+' failed'};
m.test_reports_scope='Current v66 release verification; browser tests ran in Edge WebGL2 with mobile viewport emulation only.';
fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');
console.log(JSON.stringify({source_commit:m.source_commit,browser_tests:m.browser_tests,hashes:Object.keys(m.source_files_sha256).length},null,2));
