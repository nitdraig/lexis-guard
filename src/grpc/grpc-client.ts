import * as grpc from '@grpc/grpc-js';

export interface GrpcHealthResult {
  /** True when the gRPC health service responded. */
  reachable: boolean;
  /** Serving status reported by the health service, when reachable. */
  status?: string;
  error?: string;
}

const HEALTH_CHECK_PATH = '/grpc.health.v1.Health/Check';

// HealthCheckRequest { string service = 1; }
function serializeRequest(value: { service?: string }): Buffer {
  const service = Buffer.from(value.service ?? '', 'utf-8');
  const tag = Buffer.from([0x0a]); // field 1, wire type 2 (length-delimited)
  const len = Buffer.from([service.length]);
  return Buffer.concat([tag, len, service]);
}

// HealthCheckResponse { ServingStatus status = 1; } -> enum encoded as varint.
function deserializeResponse(buffer: Buffer): { status?: string } {
  let status: number | undefined;
  for (let i = 0; i < buffer.length; ) {
    const tag = buffer[i];
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x07;
    i += 1;

    if (wireType === 0) {
      // varint
      let value = 0;
      let shift = 0;
      while (i < buffer.length) {
        const byte = buffer[i];
        i += 1;
        value |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0) break;
        shift += 7;
      }
      if (fieldNumber === 1) status = value;
    } else if (wireType === 2) {
      const len = buffer[i];
      i += 1 + len;
    } else if (wireType === 5) {
      i += 4;
    } else if (wireType === 1) {
      i += 8;
    } else {
      break;
    }
  }

  if (status === undefined) return {};
  const names: Record<number, string> = { 0: 'UNKNOWN', 1: 'SERVING', 2: 'NOT_SERVING' };
  return { status: names[status] ?? `UNKNOWN_${status}` };
}

const HEALTH_SERVICE_DEFINITION: grpc.ServiceDefinition = {
  Check: {
    path: HEALTH_CHECK_PATH,
    requestStream: false,
    responseStream: false,
    requestSerialize: serializeRequest,
    requestDeserialize: (buffer: Buffer) => ({ service: buffer.toString('utf-8') }),
    responseSerialize: (value: { status?: string }) => {
      const status = value.status === 'SERVING' ? 1 : value.status === 'NOT_SERVING' ? 2 : 0;
      return Buffer.from([0x08, status]); // field 1, varint
    },
    responseDeserialize: deserializeResponse
  }
};

/**
 * Probe a gRPC server's standard health service. Uses the real protobuf wire
 * format for the minimal health check request/response, so it works against
 * any standard gRPC server without reflection or external proto files.
 */
export function checkGrpcHealth(
  address: string,
  timeoutMs = 5000
): Promise<GrpcHealthResult> {
  return new Promise((resolve) => {
    const Ctor = grpc.makeGenericClientConstructor(
      HEALTH_SERVICE_DEFINITION,
      'grpc.health.v1.Health'
    );
    const client = new Ctor(address, grpc.credentials.createInsecure());

    const deadline = new Date();
    deadline.setMilliseconds(deadline.getMilliseconds() + timeoutMs);

    client.makeUnaryRequest(
      HEALTH_CHECK_PATH,
      serializeRequest,
      deserializeResponse,
      { service: '' },
      { deadline },
      (err: grpc.ServiceError | null, response?: { status?: string }) => {
        client.close();
        if (err) {
          resolve({ reachable: false, error: err.message });
        } else {
          resolve({ reachable: true, status: response?.status });
        }
      }
    );
  });
}
