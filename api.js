const fetch = require("node-fetch");

const BASE_URL = "https://newapi.propnex.id/api";

/**
 * Fetch current events
 */
async function fetchEvents() {
  try {
    const response = await fetch(`${BASE_URL}/curent-event`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching events:", error);
    return null;
  }
}

/**
 * Fetch point list for a specific event
 */
async function fetchPresence(eventId) {
  try {
    const response = await fetch(`${BASE_URL}/event-point?id_event=${eventId}`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching presence list:", error);
    return null;
  }
}

/**
 * Submit presence for an agent
 */
async function submitPresence(agentId, branchCode, eventId) {
  try {
    // URL encoded form data
    const params = new URLSearchParams();
    params.append("accountid", agentId);
    params.append("branchcode", branchCode);
    params.append("accounttype", "1");
    params.append("id_event", eventId);

    const response = await fetch(`${BASE_URL}/add-vo-point`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error(
      `Failed to submit presence: ${response.status} ${response.statusText}`,
    );
  } catch (error) {
    console.error("Error submitting presence:", error);
    throw error;
  }
}

module.exports = {
  fetchEvents,
  fetchPresence,
  submitPresence,
};
