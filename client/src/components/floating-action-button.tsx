interface FloatingActionButtonProps {
  onClick: () => void;
}

export default function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: '#f14247' }}
      className="fixed bottom-20 right-4 w-14 h-14 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:opacity-90 z-30"
      data-testid="fab-create-listing"
    >
      <span className="text-2xl font-light">+</span>
    </button>
  );
}
