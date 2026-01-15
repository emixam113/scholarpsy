export {default} from 'next-auth/middleware';

export const config = {
	matcher: [
		"/profil/:path*",
		"/bookmark/:path*",
		"/settings/:path:*"
	]
}