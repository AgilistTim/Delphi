import { NextRequest, NextResponse } from 'next/server';
import { readReport } from '../../../../../lib/reports';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import DelphiReportPDF from '../../../../components/pdf/DelphiReportPDF';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const report = readReport(slug);

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const pdfBuffer = await renderToBuffer(
      React.createElement(DelphiReportPDF, { report })
    );

    const filename = `${slug}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
