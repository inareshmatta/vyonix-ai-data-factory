import { NextResponse } from 'next/server';
import { JobStorage } from '@/lib/storage';

export async function GET() {
    try {
        const history = await JobStorage.getHistory();
        return NextResponse.json(history);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}
