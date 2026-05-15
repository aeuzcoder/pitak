import { Button, type ButtonProps } from "@/components/ui/button";

interface LottieButtonProps extends ButtonProps {
  loading?: boolean;
  children: React.ReactNode;
}

export function LottieButton({ loading, children, ...props }: LottieButtonProps) {
  return (
    <Button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-white animate-bounce" />
        </div>
      ) : (
        children
      )}
    </Button>
  );
}
