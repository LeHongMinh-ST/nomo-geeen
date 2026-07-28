import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
	private readonly counters = new Map<string, number>();
	increment(name: string, value = 1) {
		this.counters.set(name, (this.counters.get(name) ?? 0) + value);
	}
	toPrometheus(): string {
		return `${[...this.counters.entries()]
			.map(([name, value]) => `# TYPE ${name} counter\n${name} ${value}`)
			.join('\n')}\n`;
	}
}
