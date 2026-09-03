export function shouldEscalate(
  ticket: {
    urgency?: string | null;
    issue?: string | null;
  }
) {
  if (
    ticket.urgency ===
    "Emergency"
  ) {
    return true;
  }

  if (
    ticket.issue
      ?.toLowerCase()
      .includes("flood")
  ) {
    return true;
  }

  if (
    ticket.issue
      ?.toLowerCase()
      .includes("fire")
  ) {
    return true;
  }

  if (
    ticket.issue
      ?.toLowerCase()
      .includes("gas")
  ) {
    return true;
  }

  return false;
}
