import { DocumentDetailShell } from "@/features/workspace/components/document-detail-shell";

interface DocumentDetailPageProps {
    params: Promise<{ documentId: string }>;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
    const { documentId } = await params;
    return <DocumentDetailShell documentId={documentId} />;
}
