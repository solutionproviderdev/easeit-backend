import apiSlice from "../../api/apiSlice"; 
import { 
  FollowUpLead, 
  AddFollowUpPayload, 
  AddFollowUpResponse, 
  GetAllFollowUpsQueryParams, 
  CompleteMeetingPayload, 
  CompleteMeetingResponse, 
  SoldMeetingPayload, 
  SoldMeetingResponse,
  ProspectPayload,
  ProspectResponse
} from "../../../types/lead/sales.types"; 


// Types are now imported from centralized type files 


// Extend the apiSlice with specific endpoints for leads with reminders 
const leadSalesApi = apiSlice.injectEndpoints({ 
  endpoints: (builder) => ({ 
    getAllSalesFollowUps: builder.query({ 
      query: (params) => { 
        const queryParams = new URLSearchParams(); 
        if (params.salesExecutiveId) { 
          queryParams.append("salesExecutiveId", params.salesExecutiveId); 
        } 
        
        if (params.dateRange) { 
          queryParams.append("dateRange", params.dateRange); 
        } 
        if (params.status) { 
          queryParams.append("status", params.status); 
        } 
        return `/lead/sales/follow-up?${queryParams.toString()}`; 
      }, 
      providesTags: ["FollowUps"], 
    }), 
    completeMeeting: builder.mutation({ 
      query: ({ leadID, meetingId, payload }) => ({ 
        url: `/lead/sales/meeting-complete/${leadID}/${meetingId}`, 
        method: "PUT", 
        body: payload, 
      }), 
      // Invalidate both the Lead and Meeting tags so that the updated meeting data is re-fetched. 
      invalidatesTags: (_result, _error, { leadID, meetingId }) => [ 
        { type: "Lead", id: leadID }, 
        { type: "Meeting", id: meetingId }, 
      ], 
    }), 


    // Mutation for marking a meeting as sold 
    soldMeeting: builder.mutation({ 
      query: ({ leadID, meetingId, payload }) => ({ 
        url: `/lead/sales/sold/${leadID}/${meetingId}`, 
        method: "PUT", 
        body: payload, 
      }), 
      // Also invalidate both tags here 
      invalidatesTags: (_result, _error, { leadID, meetingId }) => [ 
        { type: "Lead", id: leadID }, 
        { type: "Meeting", id: meetingId }, 
      ], 
    }), 

    // Mutation for updating lead status to Prospect
    updateLeadToProspect: builder.mutation({
      query: ({ leadID, payload }) => ({
        url: `/lead/sales/prospect/${leadID}`,
        method: "PUT",
        body: payload,
      }),
      // Invalidate Lead tag to refresh lead data
      invalidatesTags: (_result, _error, { leadID }) => [
        { type: "Lead", id: leadID },
        "FollowUps",
      ],
    }),

    addFollowUp: builder.mutation({ 
      query: ({ leadID, payload }) => ({ 
        url: `/lead/sales/follow-up/${leadID}`, 
        method: "POST", 
        body: payload, 
      }), 
      invalidatesTags: (_result, _error, { leadID }) => [ 
        { type: "Lead", id: leadID }, 
        "FollowUps", 
      ], 
    }), 
  }), 
  overrideExisting: false, 
}); 


export const { 
  useGetAllSalesFollowUpsQuery, 
  useCompleteMeetingMutation, 
  useSoldMeetingMutation, 
  useUpdateLeadToProspectMutation,
  useAddFollowUpMutation, 
} = leadSalesApi; 


export default leadSalesApi;