export async function onRequestGet({ request }) {
    const url = new URL(request.url).searchParams.get('url');
    if (!url) return new Response('Missing params', { status: 400 });
    
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const headers = new Headers(res.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        return new Response(res.body, {
            status: res.status,
            headers: headers
        });
    } catch (e) {
        return new Response(e.message, { status: 500 });
    }
}
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Max-Age': '86400',
        }
    });
}
