export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const { email, password } = body;

        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?").bind(email, password).first();

        if (!user) return new Response(JSON.stringify({ error: "Невірний email або пароль" }), { status: 401 });

        // Update token
        const now = Math.floor(Date.now() / 1000);
        if (user.plan === 'PRO' && user.plan_expires_at && now > user.plan_expires_at) {
            user.plan = 'free';
            user.plan_expires_at = null;
            await env.DB.prepare("UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE id = ?").bind(user.id).run();
        }

        const token = crypto.randomUUID();
        await env.DB.prepare("UPDATE users SET token = ? WHERE id = ?").bind(token, user.id).run();

        // Refetch or update user object to reflect changes from expiration check
        return new Response(JSON.stringify({ 
            success: true, 
            user: { 
                email: user.email, 
                plan: user.plan, 
                plan_expires_at: user.plan_expires_at, 
                token 
            } 
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(e.message, { status: 500 });
    }
}
