import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Video } from "lucide-react";
import { createAvatarEmbed } from "@/lib/avatar.functions";

type Props = {
  voiceState: "idle" | "listening" | "speaking";
};

export function AvatarEmbed({ voiceState }: Props) {
  const fetchEmbed = useServerFn(createAvatarEmbed);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["liveavatar-embed"],
    queryFn: () => fetchEmbed(),
    staleTime: 10 * 60 * 1000,
  });

  const stateLabel =
    voiceState === "speaking" ? "Speaking" : voiceState === "listening" ? "Listening" : "Ready";

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div className="relative h-full w-full overflow-hidden">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-[11px]">Connecting live trainer…</span>
            </div>
          </div>
        )}

        {!isLoading && (error || data?.error) && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center">
            <span className="text-xs font-medium text-foreground">Avatar offline</span>
            <span className="line-clamp-3 text-[10px] text-muted-foreground">
              {data?.error ?? (error as Error)?.message}
            </span>
            <button
              onClick={() => refetch()}
              className="rounded-lg bg-gradient-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground"
            >
              Retry
            </button>
          </div>
        )}

        {data?.url && (
          <iframe
            src={data.url}
            allow="camera; microphone; autoplay; clipboard-write; display-capture"
            allowFullScreen
            className="h-full w-full border-0"
            title="Legrand Live Avatar"
          />
        )}

        {/* State overlay */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              voiceState === "speaking"
                ? "bg-primary animate-pulse"
                : voiceState === "listening"
                  ? "bg-success animate-pulse"
                  : "bg-muted-foreground"
            }`}
          />
          <span className="text-[10px] font-medium uppercase tracking-wider text-white">
            {stateLabel}
          </span>
        </div>
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur">
          <Video className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white">
            Live
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-medium text-white">Legrand AI Trainer</span>
        </div>
      </div>
    </div>
  );
}
