import { defaultGraphRepository } from './repositories/mock-graph.repository';
import { GraphService } from './services/graph.service';

const graphService = new GraphService(defaultGraphRepository);

export function getNeighbors(nodeId: string) {
  return graphService.getNeighbors(nodeId);
}

export function getSubgraph(center: string, depth = 1) {
  return graphService.getSubgraph(center, depth);
}

export function graphHealth() {
  return graphService.getHealth();
}
