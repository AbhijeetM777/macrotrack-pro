import { EtherealShadow } from "@/components/ui/etheral-shadow";

const EtherealShadowDemo = () => {
  return (
    <div className="w-full h-screen">
      <EtherealShadow
        color="rgba(128, 128, 128, 0.5)"
        animation={{ scale: 100, speed: 90 }}
        noise={{ opacity: 1, scale: 1.2 }}
        sizing="fill"
      >
        <div className="text-center space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold text-white">
            Etheral Shadows
          </h1>
          <p className="text-xl md:text-2xl text-gray-200">
            Beautiful animated background effect
          </p>
        </div>
      </EtherealShadow>
    </div>
  );
};

export { EtherealShadowDemo };
