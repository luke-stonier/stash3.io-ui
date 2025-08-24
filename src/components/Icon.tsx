export default function Icon({ classes, name, filled = false }: { classes?: string, name: string, filled?: boolean }) {
    return (
        <span className={`${classes} material-symbols${filled ? ' filled' : ''}`}>
            {name}
        </span>
    );
}