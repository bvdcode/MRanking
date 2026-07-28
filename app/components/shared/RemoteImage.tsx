import Image from "next/image";
import type { ImageProps } from "next/image";

type RemoteImageProps = Omit<ImageProps, "alt" | "height" | "width"> & {
  alt?: string;
};

export function RemoteImage({ alt = "", ...props }: RemoteImageProps) {
  return <Image {...props} alt={alt} height={360} unoptimized width={640} />;
}
