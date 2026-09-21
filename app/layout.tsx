import "./globals.css";

export const metadata = {
  title: "Asistencia · Alaia Wellness Club",
  description: "Sistema de control de asistencia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
