import { TutlyAPIClient } from './client';

export interface AssignmentDetails {
  assignment: {
    id: string;
    title: string;
    details: string;
    detailsJson?: any;
  } | null;
  mentorDetails?: {
    mentor: {
      username: string;
    } | null;
  } | null;
  error?: string;
}

export class AssignmentApiClient extends TutlyAPIClient {
  /**
   * Fetch assignment details for submission
   * @param assignmentId - The assignment ID
   * @param webOrigin - The web application origin (e.g., http://localhost:3000)
   * @param authToken - Optional bearer token for authentication
   */
  async getAssignmentDetails(
    assignmentId: string,
    webOrigin: string,
    authToken?: string
  ): Promise<AssignmentDetails> {
    // Create a new instance with the provided baseUrl and token
    const client = new TutlyAPIClient(webOrigin, authToken);
    return client['trpcRequest']<AssignmentDetails>(
      'assignments.getAssignmentDetailsForSubmission',
      { id: assignmentId }
    );
  }
}

