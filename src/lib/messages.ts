const SUBMISSION_MESSAGES = [
  "Another one bites the dust.",
  "One less thing haunting your to-do list.",
  "Submitted. The supervisor has received the offering.",
  "Task successfully escaped your hands.",
  "Another report has been sacrificed to QMS.",
  "Clean. Submitted. Moving on.",
  "It has left the building.",
  "Filed, sealed, forgotten (in a good way).",
];

export function randomSubmissionMessage(): string {
  return SUBMISSION_MESSAGES[
    Math.floor(Math.random() * SUBMISSION_MESSAGES.length)
  ];
}
