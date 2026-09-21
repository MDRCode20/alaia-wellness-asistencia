import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// RF-11: exigir credenciales para acceder al panel de Administración.
// Este middleware corre antes de cualquier página bajo /admin y revisa
// si hay una sesión válida; si no la hay, redirige al login.
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(nombre) {
          return request.cookies.get(nombre)?.value;
        },
        set(nombre, valor, opciones) {
          respuesta.cookies.set(nombre, valor, opciones);
        },
        remove(nombre, opciones) {
          respuesta.cookies.set(nombre, "", { ...opciones, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esRutaLogin = request.nextUrl.pathname === "/admin/login";

  if (!user && !esRutaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // Si ya inició sesión y visita /admin/login, mándala directo al panel.
  if (user && esRutaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return respuesta;
}

export const config = {
  matcher: ["/admin/:path*"],
};
