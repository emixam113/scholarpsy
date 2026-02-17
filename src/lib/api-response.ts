import { NextResponse } from 'next/server';

export function apiSuccess(data?: any, message?: string): NextResponse {
	return NextResponse.json({
		success: true,
		message,
		...data
	});
}

export function apiError(message: string, status: number = 400): NextResponse {
	return NextResponse.json({
		success: false,
		error: message
	}, { status });
}