const rank:Record<string,number>={queued:1,initiated:2,ringing:3,answered:4,"in-progress":4,completed:8,busy:8,failed:8,"no-answer":8,canceled:8};
export function shouldAcceptTwilioStatus(current:string|null|undefined,incoming:string){return !current||(rank[incoming]||0)>=(rank[current]||0)}
export function needsCallFollowUp(status:string){return["busy","failed","no-answer","canceled"].includes(status)}
