import { prisma } from "@/core/db/prisma";
import { NextRequest, NextResponse } from "next/server";



export async function GET(request: NextRequest) {

    try{
        //Perform user toke validation

        const companions = await prisma.aICompanion.findMany( {
            where: {
                isActive: true,
            },
        });

        return NextResponse.json({
            companions
        });
    }catch(error){
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
    }
}