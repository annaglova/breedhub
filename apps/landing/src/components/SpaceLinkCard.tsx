export type SpaceLink = {
  action: string;
  coverText: string;
  description: string;
  img: string;
  link: string;
  name: string;
  points: string;
};

export default function SpaceLinkCard({ space }: { space: SpaceLink }) {
  return (
    <a href={space.link} className="flex max-w-sm flex-col sm:max-w-none group">
      <div className="relative flex h-[340px] items-center justify-center overflow-hidden rounded-xl border">
        <div className="group flex cursor-pointer items-center justify-center duration-300 hover:scale-110">
          {/* Overlay effect */}
          <div className="absolute z-10 h-[340px] w-[110%] duration-300 group-hover:bg-black/30">
            <div className="px-18 hidden h-full w-full items-end py-8 text-lg text-white group-hover:flex">
              {space.coverText}
            </div>
          </div>
          <img
            className="h-full w-auto max-w-[150%]"
            src={space.img}
            alt="Space"
          />
        </div>
      </div>
      <div className="w-full space-y-2 px-5 py-3">
        <div className="flex">
          <div className="text-xl font-bold uppercase">{space.name}</div>
          <div className="text-primary-700 ml-auto">{space.action}</div>
        </div>
        <div className="text-secondary-600 font-bold">{space.points}</div>
        <div className="text-secondary flex">{space.description}</div>
      </div>
    </a>
  );
}
