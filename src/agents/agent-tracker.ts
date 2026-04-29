/**
 * Agent Execution Tracker
 * Tracks concurrent agent executions and logs debug info
 */

let activeAgents = 0;

export function startAgent(agentName: string): void {
  activeAgents++;
  console.log(
    `[AGENT] ${agentName} started | Active agents: ${activeAgents}`
  );
}

export function endAgent(agentName: string): void {
  activeAgents--;
  console.log(
    `[AGENT] ${agentName} finished | Active agents: ${activeAgents}`
  );
}

export function getActiveAgentCount(): number {
  return activeAgents;
}
