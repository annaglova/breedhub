/**
 * FormGroupLayout - Renders form fields in horizontal or vertical column layout.
 * Handles fullWidth fields separately from regular grid fields.
 *
 * Used by EditFormTab and EditChildRecordDialog.
 */
import React from "react";

interface FormGroupLayoutProps {
  layout: "horizontal" | "vertical";
  fields: Array<[string, { fullWidth?: boolean; [key: string]: any }]>;
  renderField: (fieldId: string, field: any) => React.ReactNode;
}

export function FormGroupLayout({ layout, fields, renderField }: FormGroupLayoutProps) {
  const fullWidthFields = fields.filter(([, f]) => f.fullWidth);
  const regularFields = fields.filter(([, f]) => !f.fullWidth);

  if (regularFields.length === 0) {
    return <>{fullWidthFields.map(([fieldId, field]) => <React.Fragment key={fieldId}>{renderField(fieldId, field)}</React.Fragment>)}</>;
  }

  if (layout === "horizontal") {
    return (
      <>
        {fullWidthFields.map(([fieldId, field]) => <React.Fragment key={fieldId}>{renderField(fieldId, field)}</React.Fragment>)}
        <div className="sm:grid sm:grid-cols-2 sm:gap-x-3 gap-y-1">
          {regularFields.map(([fieldId, field]) => <React.Fragment key={fieldId}>{renderField(fieldId, field)}</React.Fragment>)}
        </div>
      </>
    );
  }

  // Vertical: column fill (first half left, second half right)
  const mid = Math.ceil(regularFields.length / 2);
  const leftCol = regularFields.slice(0, mid);
  const rightCol = regularFields.slice(mid);

  return (
    <>
      {fullWidthFields.map(([fieldId, field]) => <React.Fragment key={fieldId}>{renderField(fieldId, field)}</React.Fragment>)}
      <div className="sm:grid sm:grid-cols-2 sm:gap-x-3">
        <div className="space-y-1">
          {leftCol.map(([fieldId, field]) => <React.Fragment key={fieldId}>{renderField(fieldId, field)}</React.Fragment>)}
        </div>
        <div className="space-y-1">
          {rightCol.map(([fieldId, field]) => <React.Fragment key={fieldId}>{renderField(fieldId, field)}</React.Fragment>)}
        </div>
      </div>
    </>
  );
}
