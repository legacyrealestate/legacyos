export async function runWorkflow(
  ticket: {
    urgency?: string | null;
    issue?: string | null;
  }
) {

  const actions: string[] = [];

  if (
    ticket.urgency ===
    "Emergency"
  ) {

    actions.push(
      "Emergency escalation triggered"
    );

    actions.push(
      "Staff emergency review required"
    );

    actions.push(
      "Risk engine activated"
    );

  }

  if (
    ticket.issue
      ?.toLowerCase()
      .includes("water")
  ) {

    actions.push(
      "Potential structural damage risk detected"
    );

  }

  return actions;
}
