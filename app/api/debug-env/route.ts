import { NextResponse } from 'next/server';

// TEMPORARY diagnostic endpoint — reports only whether specific env vars are SET,
// never their values. Delete once the GEMINI_API_KEY propagation issue is resolved.
export async function GET() {
    const checkedKeys = [
        'GEMINI_API_KEY',
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASS',
        'NODE_ENV',
        'K_SERVICE',
        'FUNCTION_TARGET',
    ];
    const presence: Record<string, boolean> = {};
    for (const key of checkedKeys) {
        presence[key] = typeof process.env[key] === 'string' && process.env[key]!.length > 0;
    }
    return NextResponse.json({
        presence,
        totalEnvVarCount: Object.keys(process.env).length,
        geminiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
    });
}
