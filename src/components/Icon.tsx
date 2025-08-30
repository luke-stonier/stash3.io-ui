export default function Icon({ className, name, filled = false }: { className?: string, name: string, filled?: boolean }) {
    return (
        <span className={`${className} material-symbols${filled ? ' filled' : ''}`}>
            {name}
        </span>
    );
}