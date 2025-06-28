// Для SVG як компонента та як src
declare module "*.svg?react" {
  import * as React from "react";
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export { ReactComponent };
  export default ReactComponent;
}
declare module "*.svg" {
  const src: string;
  export default src;
}

// Для картинок
declare module "*.jpg" {
  const value: string;
  export default value;
}
declare module "*.jpeg" {
  const value: string;
  export default value;
}
declare module "*.png" {
  const value: string;
  export default value;
}
