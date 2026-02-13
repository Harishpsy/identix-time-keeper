import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Verify the caller is an admin
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Get calling user
  const { data: { user: caller } } = await supabaseUser.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!caller) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check admin role
  const { data: callerRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .single();

  if (!callerRole || callerRole.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, password, full_name, biometric_id, department_id, shift_id, role, date_of_joining } = await req.json();

  // Validate required fields
  if (!email || !password || !full_name) {
    return new Response(JSON.stringify({ error: "email, password, and full_name are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (password.length < 6) {
    return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create auth user
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update profile with additional fields (trigger already created basic profile)
  const updates: Record<string, any> = {};
  if (biometric_id !== undefined && biometric_id !== null && biometric_id !== "") {
    updates.biometric_id = String(biometric_id).trim();
  }
  if (department_id) updates.department_id = department_id;
  if (shift_id) updates.shift_id = shift_id;
  if (date_of_joining) updates.date_of_joining = date_of_joining;

  if (Object.keys(updates).length > 0) {
    await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", newUser.user.id);
  }

  // Update role if not default employee
  if (role && role !== "employee") {
    await supabaseAdmin
      .from("user_roles")
      .update({ role })
      .eq("user_id", newUser.user.id);
  }

  return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
