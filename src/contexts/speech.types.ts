export const ConversationState = {
  Idle: "idle",
  WakeListening: "wake-listening",
  ActiveListening: "active-listening",
  Speaking: "speaking",
  Paused: "paused",
} as const;

export type ConversationStateKey = keyof typeof ConversationState;
export type ConversationStateValue =
  (typeof ConversationState)[ConversationStateKey];
