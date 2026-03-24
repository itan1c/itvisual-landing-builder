export async function onRequestGet({ request, env }) {
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    const token = auth.replace("Bearer ", "");

    const user = await env.DB.prepare("SELECT email, plan, plan_expires_at, token FROM users WHERE token = ?").bind(token).first();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const now = Math.floor(Date.now() / 1000);
    if (user.plan === 'PRO' && user.plan_expires_at && now > user.plan_expires_at) {
        user.plan = 'free';
        user.plan_expires_at = null;
        await env.DB.prepare("UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE token = ?").bind(token).run();
    }

    return new Response(JSON.stringify({ success: true, user }), { headers: { "Content-Type": "application/json" } });
}
