import { redirect } from "next/navigation";

interface DocumentDetailPageProps {
    params: Promise<{ documentId: string }>;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
    await params;
    redirect("/documents");
}
