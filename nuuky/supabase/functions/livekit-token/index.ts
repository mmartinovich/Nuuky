import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AccessToken } from "npm:livekit-server-sdk@2";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
};

interface TokenRequest {
  roomId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get LiveKit credentials from environment
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error("LiveKit not configured", {
        apiKey: !!apiKey,
        apiSecret: !!apiSecret,
        livekitUrl: !!livekitUrl,
      });
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client with service role for user verification
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { roomId }: TokenRequest = await req.json();

    if (!roomId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is a participant of the room before issuing token
    const { data: participant, error: participantError } = await supabaseAdmin
      .from("room_participants")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (participantError) {
      console.error("Participant check error:", participantError);
    }

    if (!participant) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user display name for participant identity
    const { data: userData, error: profileError } = await supabaseAdmin
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
    }

    const displayName = userData?.display_name || "Unknown";

    console.log(
      `Generating LiveKit token for user ${user.id} (${displayName}) in room ${roomId}`
    );

    // Create LiveKit access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: displayName,
      ttl: "2h", // Token valid for 2 hours
    });

    // Grant room permissions
    at.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate JWT token
    const livekitToken = await at.toJwt();

    console.log(`Token generated for ${displayName} in room ${roomId}`);

    return new Response(
      JSON.stringify({
        token: livekitToken,
        roomName: roomId,
        serverUrl: livekitUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
