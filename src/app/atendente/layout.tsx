import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import React from 'react';

export default async function AtendenteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    if (session.user.role !== 'ATENDENTE') {
        // If an ADMIN tries to access atendente pages, we redirect them to their dashboard
        // or we could allow them. For now, strict separation as per middleware logic.
        redirect('/admin/dashboard');
    }

    return <>{children}</>;
}
