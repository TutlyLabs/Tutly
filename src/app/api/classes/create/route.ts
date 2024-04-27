import { createClass  } from "@/actions/classes";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const data = await request.json();
    
    try {
        const myClass = await createClass(data);
        return NextResponse.json(myClass);
    } catch (e :any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}