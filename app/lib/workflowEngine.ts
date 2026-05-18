export async function runWorkflow(
  ticket: any
) {

  const actions = [];

  if (
    ticket.urgency ===
    "Emergency"
  ) {

    actions.push(
      "Emergency escalation triggered"
    );

    actions.push(
      "Vendor dispatch triggered"
    );

    actions.push(
      "Operations notified"
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