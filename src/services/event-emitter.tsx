export class EventSubscription<T> {
	public invocations: number = 0;

	constructor(public id: number, private callback: (_: T) => void) {}

	public invoke(data: T): void {
		this.invocations++;
		this.callback(data);
	}
}

export default class EventEmitter<T> {
	private _subCountIndex: number = 0;
	private _listenerCount: number = 0;
	private _listeners: EventSubscription<T>[] = [];

	public get Count() {
		return this._listenerCount;
	}

	public subscribe(callback: (_: T) => void): EventSubscription<T> {
		this._listenerCount++;
		this._subCountIndex++;
		var subscription = new EventSubscription<T>(this._subCountIndex, callback);
		this._listeners.push(subscription);
		return subscription;
	}

	public unsubscribe(subscription: EventSubscription<T>): void {
		var listenerIndex = this._listeners.findIndex((l) => l.id === subscription.id);
		this._listeners.splice(listenerIndex, 1);
		this._listenerCount--;
	}

	public emit(data: T): Promise<void> {
		this._listeners.map((l) => l.invoke(data));
		return new Promise((_, __) => {
			_();
		});
	}
}
