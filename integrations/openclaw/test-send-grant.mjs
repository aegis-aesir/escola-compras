// Paired, finite authorization for ONE existing task; never a phone allowlist.
// Configuration contains operational/private data and must stay outside Git/logs.
export function parseTestSendGrant(raw,now=new Date().toISOString()) {
 let value=raw;try{if(typeof raw==='string')value=JSON.parse(raw);}catch{return undefined;}
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const {jobId,version,target,issuedAt,expiresAt}=value;
 if(typeof jobId!=='string'||!/^whatsapp:[a-f0-9]{64}$/.test(jobId)||!Number.isSafeInteger(version)||version<1||typeof target!=='string'||!/^\+[1-9]\d{9,14}$/.test(target)||target==='+559292017107'||typeof issuedAt!=='string'||typeof expiresAt!=='string')return undefined;
 const at=Date.parse(now),start=Date.parse(issuedAt),end=Date.parse(expiresAt);
 if(![at,start,end].every(Number.isFinite)||start>at||end<=at||end<=start||end-start>900000)return undefined;
 return {jobId,version,target,issuedAt,expiresAt};
}
export function pairedTestSendGrant(server,bridge,now){
 const a=parseTestSendGrant(server,now),b=parseTestSendGrant(bridge,now);
 return a&&b&&Object.keys(a).every(key=>a[key]===b[key])?a:undefined;
}
export function matchesTestSendJob(raw,job,phase,now=new Date().toISOString()) {
 const grant=parseTestSendGrant(raw,now);
 if(!grant||!job||job.type!=='whatsapp_quote'||job.id!==grant.jobId||job.target!==grant.target||job.sentAt!==undefined||job.providerMessageId!==undefined)return false;
 if(phase==='claim')return job.version===grant.version&&job.attempts===0&&['blocked','queued'].includes(job.state)&&job.leaseToken===undefined&&job.leaseUntil===undefined&&job.testSend===undefined;
 return phase==='dispatch'&&job.version===grant.version+1&&job.attempts===1&&job.state==='running'&&typeof job.leaseToken==='string'&&job.leaseToken.length>=20&&Date.parse(job.leaseUntil)>Date.parse(now)&&job.testSend?.version===grant.version&&job.testSend?.issuedAt===grant.issuedAt&&job.testSend?.expiresAt===grant.expiresAt;
}
