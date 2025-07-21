import Docker from 'dockerode';
import { Logger } from './logger.js';
import { DockerError, ServiceConfig, ImageResult, HealthStatus } from './types.js';

export class DockerManager {
  private docker: Docker;
  private logger: Logger;

  constructor() {
    this.docker = new Docker();
    this.logger = new Logger('DockerManager');
  }

  // Build Docker image from Dockerfile
  async buildImage(
    dockerfilePath: string, 
    imageName: string, 
    buildArgs: Record<string, string> = {},
    labels: Record<string, string> = {}
  ): Promise<ImageResult> {
    try {
      this.logger.stepStart(`Building image: ${imageName}`);
      const start = Date.now();

      const stream = await this.docker.buildImage({
        context: dockerfilePath,
        src: ['Dockerfile']
      }, {
        t: imageName,
        buildargs: buildArgs,
        labels: labels
      });

      // Process build stream
      const buildOutput: string[] = [];
      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }, (event) => {
          if (event.stream) {
            buildOutput.push(event.stream);
            this.logger.debug('Build output', { output: event.stream.trim() });
          }
          if (event.error) {
            this.logger.error('Build error', new Error(event.error));
          }
        });
      });

      // Get image info
      const image = this.docker.getImage(imageName);
      const imageInfo = await image.inspect();
      
      const duration = Date.now() - start;
      this.logger.stepComplete(`Building image: ${imageName}`, duration);

      return {
        success: true,
        imageId: imageInfo.Id,
        tag: imageName,
        size: imageInfo.Size,
      };
    } catch (error) {
      this.logger.stepFailed(`Building image: ${imageName}`, error as Error);
      throw new DockerError(`Failed to build image ${imageName}: ${(error as Error).message}`, {
        imageName,
        dockerfilePath
      });
    }
  }

  // Pull Docker image from registry
  async pullImage(imageName: string): Promise<ImageResult> {
    try {
      this.logger.stepStart(`Pulling image: ${imageName}`);
      const start = Date.now();

      const stream = await this.docker.pull(imageName);
      
      // Process pull stream
      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }, (event) => {
          if (event.status) {
            this.logger.debug('Pull status', { status: event.status, progress: event.progress });
          }
        });
      });

      // Get image info
      const image = this.docker.getImage(imageName);
      const imageInfo = await image.inspect();
      
      const duration = Date.now() - start;
      this.logger.stepComplete(`Pulling image: ${imageName}`, duration);

      return {
        success: true,
        imageId: imageInfo.Id,
        tag: imageName,
        size: imageInfo.Size,
      };
    } catch (error) {
      this.logger.stepFailed(`Pulling image: ${imageName}`, error as Error);
      throw new DockerError(`Failed to pull image ${imageName}: ${(error as Error).message}`, {
        imageName
      });
    }
  }

  // Create and start container
  async createContainer(config: ServiceConfig): Promise<Docker.Container> {
    try {
      this.logger.stepStart(`Creating container: ${config.name}`);

      const portBindings: Record<string, Array<{ HostPort: string }>> = {};
      const exposedPorts: Record<string, {}> = {};

      // Configure port mappings
      config.ports.forEach(port => {
        const containerPort = `${port.container}/${port.protocol}`;
        portBindings[containerPort] = [{ HostPort: port.host.toString() }];
        exposedPorts[containerPort] = {};
      });

      // Configure volume mounts
      const binds = config.volumes.map(volume => 
        `${volume.host}:${volume.container}:${volume.mode}`
      );

      const container = await this.docker.createContainer({
        Image: config.image,
        name: config.name,
        Env: Object.entries(config.environment).map(([key, value]) => `${key}=${value}`),
        ExposedPorts: exposedPorts,
        HostConfig: {
          PortBindings: portBindings,
          Binds: binds,
          RestartPolicy: { Name: 'unless-stopped' }
        },
        Healthcheck: config.healthCheck ? {
          Test: [`CMD-SHELL`, `curl -f ${config.healthCheck.endpoint} || exit 1`],
          Interval: config.healthCheck.interval * 1000000000, // Convert to nanoseconds
          Timeout: config.healthCheck.timeout * 1000000000,
          Retries: config.healthCheck.retries
        } : undefined
      });

      this.logger.stepComplete(`Creating container: ${config.name}`, 0);
      return container;
    } catch (error) {
      this.logger.stepFailed(`Creating container: ${config.name}`, error as Error);
      throw new DockerError(`Failed to create container ${config.name}: ${(error as Error).message}`, {
        serviceName: config.name,
        image: config.image
      });
    }
  }

  // Start container
  async startContainer(container: Docker.Container): Promise<void> {
    try {
      const containerInfo = await container.inspect();
      this.logger.stepStart(`Starting container: ${containerInfo.Name}`);

      await container.start();
      
      this.logger.stepComplete(`Starting container: ${containerInfo.Name}`, 0);
    } catch (error) {
      const containerInfo = await container.inspect();
      this.logger.stepFailed(`Starting container: ${containerInfo.Name}`, error as Error);
      throw new DockerError(`Failed to start container: ${(error as Error).message}`);
    }
  }

  // Stop container
  async stopContainer(containerName: string): Promise<void> {
    try {
      this.logger.stepStart(`Stopping container: ${containerName}`);
      
      const container = this.docker.getContainer(containerName);
      await container.stop();
      
      this.logger.stepComplete(`Stopping container: ${containerName}`, 0);
    } catch (error) {
      this.logger.stepFailed(`Stopping container: ${containerName}`, error as Error);
      throw new DockerError(`Failed to stop container ${containerName}: ${(error as Error).message}`, {
        containerName
      });
    }
  }

  // Remove container
  async removeContainer(containerName: string): Promise<void> {
    try {
      this.logger.stepStart(`Removing container: ${containerName}`);
      
      const container = this.docker.getContainer(containerName);
      await container.remove({ force: true });
      
      this.logger.stepComplete(`Removing container: ${containerName}`, 0);
    } catch (error) {
      this.logger.stepFailed(`Removing container: ${containerName}`, error as Error);
      throw new DockerError(`Failed to remove container ${containerName}: ${(error as Error).message}`, {
        containerName
      });
    }
  }

  // Get container status
  async getContainerStatus(containerName: string): Promise<HealthStatus> {
    try {
      const container = this.docker.getContainer(containerName);
      const containerInfo = await container.inspect();
      
      const isRunning = containerInfo.State.Running;
      const health = containerInfo.State.Health;
      
      return {
        service: containerName,
        healthy: isRunning && (!health || health.Status === 'healthy'),
        responseTime: 0, // Will be set by health check
        lastCheck: new Date(),
        ...(health?.Status === 'unhealthy' && { 
          errors: health.Log?.map(log => log.Output) || [] 
        })
      };
    } catch (error) {
      this.logger.error(`Failed to get container status for ${containerName}`, error as Error);
      return {
        service: containerName,
        healthy: false,
        responseTime: 0,
        lastCheck: new Date(),
        errors: [(error as Error).message]
      };
    }
  }

  // List running containers
  async listContainers(): Promise<Docker.ContainerInfo[]> {
    try {
      return await this.docker.listContainers();
    } catch (error) {
      this.logger.error('Failed to list containers', error as Error);
      throw new DockerError(`Failed to list containers: ${(error as Error).message}`);
    }
  }

  // Clean up unused images and containers
  async cleanup(): Promise<void> {
    try {
      this.logger.stepStart('Docker cleanup');
      
      // Remove stopped containers
      await this.docker.pruneContainers();
      
      // Remove unused images
      await this.docker.pruneImages();
      
      // Remove unused volumes
      await this.docker.pruneVolumes();
      
      this.logger.stepComplete('Docker cleanup', 0);
    } catch (error) {
      this.logger.stepFailed('Docker cleanup', error as Error);
      throw new DockerError(`Failed to cleanup Docker resources: ${(error as Error).message}`);
    }
  }

  // Check if Docker is available
  async checkDockerAvailability(): Promise<boolean> {
    try {
      await this.docker.ping();
      this.logger.info('Docker daemon is available');
      return true;
    } catch (error) {
      this.logger.error('Docker daemon is not available', error as Error);
      return false;
    }
  }
}