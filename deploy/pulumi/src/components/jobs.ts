import * as k8s from '@pulumi/kubernetes'
import { dbEnv, kafkaEnv } from '../utils/env'
import { githubImage } from '../utils/image'
import { Configuration } from '../config'

export const cleanup = (config: Configuration, provider?: k8s.Provider) =>
  new k8s.batch.v1.CronJob(
    'cleanup-job',
    {
      metadata: {
        labels: {
          job: 'cleanup',
        },
        name: 'cleanup',
        namespace: 'rnd',
      },
      spec: {
        successfulJobsHistoryLimit: 0,
        failedJobsHistoryLimit: 0,
        schedule: '0 * * * *',
        jobTemplate: {
          spec: {
            template: {
              spec: {
                restartPolicy: 'OnFailure',
                containers: [
                  {
                    name: 'cli',
                    image: githubImage(config, 'cli'),
                    command: ['npm', 'run', 'cleanup'],
                    env: [...dbEnv(config), ...kafkaEnv(config)],
                  },
                ],
              },
            },
          },
        },
      },
    },
    { provider }
  )

export const migration = (config: Configuration, provider?: k8s.Provider) =>
  new k8s.batch.v1.Job(
    'migration-job',
    {
      metadata: {
        labels: {
          job: 'migrations',
        },
        name: 'migrations',
        namespace: 'rnd',
      },
      spec: {
        template: {
          spec: {
            restartPolicy: 'OnFailure',
            containers: [
              {
                name: 'cli-db-migrations',
                image: githubImage(config, 'cli'),
                command: ['npm', 'run', 'migrate'],
                env: [...dbEnv(config), ...kafkaEnv(config)],
              },
              {
                name: 'cli-topic-migrations',
                image: githubImage(config, 'cli'),
                command: ['npm', 'run', 'topics'],
                env: [...dbEnv(config), ...kafkaEnv(config)],
              },
              {
                name: 'cli-keycloak-migrations',
                image: githubImage(config, 'cli'),
                command: ['npm', 'run', 'keycloak'],
                env: [
                  {
                    name: 'KEYCLOAK_URL',
                    value: 'http://keycloak:8080',
                  },
                  {
                    name: 'KEYCLOAK_USERNAME',
                    value: 'admin',
                  },
                  {
                    name: 'KEYCLOAK_PASSWORD',
                    value: 'admin',
                  },
                  {
                    name: 'KEYCLOAK_REALM',
                    value: 'rnd',
                  },
                ],
              },
            ],
          },
        },
      },
    },
    { provider }
  )
