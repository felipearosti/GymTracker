import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const workouts = [
  {
    code: 'A',
    name: 'Peito + Tríceps',
    dayOfWeek: 1,
    order: 1,
    exercises: [
      {
        name: 'Supino reto com halteres',
        order: 1, setsTarget: 4, repsMin: 8, repsMax: 12, restSeconds: 150,
        youtubeUrl: 'https://www.youtube.com/results?search_query=supino+reto+halteres+execucao',
        notes: 'Carga pesada, RIR 1-2. Desça até o peito.',
        muscleLoads: [
          { muscle: 'chest', loadFactor: 1.0 },
          { muscle: 'triceps', loadFactor: 0.5 },
          { muscle: 'front_delt', loadFactor: 0.4 },
        ],
      },
      {
        name: 'Supino inclinado na máquina',
        order: 2, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 120,
        youtubeUrl: 'https://www.youtube.com/results?search_query=supino+inclinado+maquina+execucao',
        notes: 'Foco na porção clavicular do peitoral.',
        muscleLoads: [
          { muscle: 'chest', loadFactor: 1.0 },
          { muscle: 'front_delt', loadFactor: 0.5 },
          { muscle: 'triceps', loadFactor: 0.4 },
        ],
      },
      {
        name: 'Crucifixo inclinado com halteres',
        order: 3, setsTarget: 3, repsMin: 12, repsMax: 15, restSeconds: 90,
        youtubeUrl: 'https://www.youtube.com/results?search_query=crucifixo+inclinado+halteres+execucao',
        notes: 'Exercício de alongamento/isolamento.',
        muscleLoads: [
          { muscle: 'chest', loadFactor: 0.9 },
          { muscle: 'front_delt', loadFactor: 0.3 },
        ],
      },
      {
        name: 'Tríceps testa com barra EZ',
        order: 4, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 90,
        youtubeUrl: 'https://www.youtube.com/results?search_query=triceps+testa+barra+ez+execucao',
        notes: 'Variação com alongamento da cabeça longa.',
        muscleLoads: [
          { muscle: 'triceps', loadFactor: 1.0 },
        ],
      },
      {
        name: 'Tríceps corda na polia',
        order: 5, setsTarget: 3, repsMin: 12, repsMax: 15, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=triceps+corda+polia+execucao',
        notes: 'Abra a corda no final do movimento.',
        muscleLoads: [
          { muscle: 'triceps', loadFactor: 0.9 },
        ],
      },
      {
        name: 'Elevação lateral com halteres',
        order: 6, setsTarget: 3, repsMin: 12, repsMax: 15, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=elevacao+lateral+halteres+execucao',
        notes: 'Primeira dose semanal de ombro lateral. RIR 2-3.',
        muscleLoads: [
          { muscle: 'side_delt', loadFactor: 1.0 },
          { muscle: 'front_delt', loadFactor: 0.2 },
        ],
      },
    ],
  },
  {
    code: 'B',
    name: 'Costas + Bíceps',
    dayOfWeek: 2,
    order: 2,
    exercises: [
      {
        name: 'Puxada alta na polia',
        order: 1, setsTarget: 4, repsMin: 8, repsMax: 12, restSeconds: 150,
        youtubeUrl: 'https://www.youtube.com/results?search_query=puxada+alta+polia+execucao',
        notes: 'Pegada aberta pronada. Puxe levando cotovelos ao lado do corpo.',
        muscleLoads: [
          { muscle: 'lats', loadFactor: 1.0 },
          { muscle: 'biceps', loadFactor: 0.6 },
          { muscle: 'mid_back', loadFactor: 0.3 },
        ],
      },
      {
        name: 'Remada curvada com barra',
        order: 2, setsTarget: 3, repsMin: 8, repsMax: 10, restSeconds: 150,
        youtubeUrl: 'https://www.youtube.com/results?search_query=remada+curvada+barra+execucao',
        notes: 'Postura neutra, sem balanço.',
        muscleLoads: [
          { muscle: 'lats', loadFactor: 0.8 },
          { muscle: 'mid_back', loadFactor: 1.0 },
          { muscle: 'biceps', loadFactor: 0.5 },
          { muscle: 'lower_back', loadFactor: 0.3 },
        ],
      },
      {
        name: 'Remada baixa sentado',
        order: 3, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 90,
        youtubeUrl: 'https://www.youtube.com/results?search_query=remada+baixa+sentado+execucao',
        notes: 'Pegada neutra. Foco em trapézio médio e romboides.',
        muscleLoads: [
          { muscle: 'mid_back', loadFactor: 1.0 },
          { muscle: 'lats', loadFactor: 0.6 },
          { muscle: 'biceps', loadFactor: 0.4 },
        ],
      },
      {
        name: 'Pull-over na polia',
        order: 4, setsTarget: 3, repsMin: 12, repsMax: 15, restSeconds: 90,
        youtubeUrl: 'https://www.youtube.com/results?search_query=pullover+polia+execucao',
        notes: 'Alongamento do grande dorsal.',
        muscleLoads: [
          { muscle: 'lats', loadFactor: 0.9 },
          { muscle: 'chest', loadFactor: 0.3 },
        ],
      },
      {
        name: 'Rosca direta com barra EZ',
        order: 5, setsTarget: 3, repsMin: 8, repsMax: 10, restSeconds: 90,
        youtubeUrl: 'https://www.youtube.com/results?search_query=rosca+direta+barra+ez+execucao',
        notes: 'Principal exercício de bíceps. Carga pesada, RIR 1-2.',
        muscleLoads: [
          { muscle: 'biceps', loadFactor: 1.0 },
          { muscle: 'forearm', loadFactor: 0.3 },
        ],
      },
      {
        name: 'Rosca martelo com halteres',
        order: 6, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=rosca+martelo+halteres+execucao',
        notes: 'Pega o braquial e o braquiorradial.',
        muscleLoads: [
          { muscle: 'biceps', loadFactor: 0.8 },
          { muscle: 'forearm', loadFactor: 0.6 },
        ],
      },
      {
        name: 'Face pull na polia',
        order: 7, setsTarget: 3, repsMin: 15, repsMax: 20, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=face+pull+polia+execucao',
        notes: 'Saúde do ombro e postura.',
        muscleLoads: [
          { muscle: 'rear_delt', loadFactor: 1.0 },
          { muscle: 'upper_back', loadFactor: 0.5 },
        ],
      },
    ],
  },
  {
    code: 'C',
    name: 'Pernas (quadríceps)',
    dayOfWeek: 3,
    order: 3,
    exercises: [
      {
        name: 'Agachamento livre',
        order: 1, setsTarget: 4, repsMin: 6, repsMax: 10, restSeconds: 180,
        youtubeUrl: 'https://www.youtube.com/results?search_query=agachamento+livre+execucao+tecnica',
        notes: 'Desça até a coxa ficar paralela ao chão.',
        muscleLoads: [
          { muscle: 'quads', loadFactor: 1.0 },
          { muscle: 'glutes', loadFactor: 0.7 },
          { muscle: 'hamstrings', loadFactor: 0.3 },
          { muscle: 'lower_back', loadFactor: 0.3 },
        ],
      },
      {
        name: 'Leg press 45°',
        order: 2, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 120,
        youtubeUrl: 'https://www.youtube.com/results?search_query=leg+press+45+execucao',
        notes: 'Pés mais abaixo da plataforma para mais quadríceps.',
        muscleLoads: [
          { muscle: 'quads', loadFactor: 0.9 },
          { muscle: 'glutes', loadFactor: 0.5 },
        ],
      },
      {
        name: 'Cadeira extensora',
        order: 3, setsTarget: 3, repsMin: 12, repsMax: 15, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=cadeira+extensora+execucao',
        notes: 'Isolamento do quadríceps. Pausa de 1s no topo.',
        muscleLoads: [
          { muscle: 'quads', loadFactor: 1.0 },
        ],
      },
      {
        name: 'Afundo com halteres',
        order: 4, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 90,
        youtubeUrl: 'https://www.youtube.com/results?search_query=afundo+halteres+execucao',
        notes: 'Unilateral — corrige assimetrias e ativa muito glúteo.',
        muscleLoads: [
          { muscle: 'quads', loadFactor: 0.8 },
          { muscle: 'glutes', loadFactor: 0.8 },
          { muscle: 'hamstrings', loadFactor: 0.3 },
        ],
      },
      {
        name: 'Panturrilha em pé na máquina',
        order: 5, setsTarget: 4, repsMin: 10, repsMax: 15, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=panturrilha+em+pe+maquina+execucao',
        notes: 'Essencial para o gastrocnêmio. Alongamento máximo embaixo.',
        muscleLoads: [
          { muscle: 'calves_gastro', loadFactor: 1.0 },
          { muscle: 'calves_soleus', loadFactor: 0.3 },
        ],
      },
    ],
  },
  {
    code: 'D',
    name: 'Ombros + Braços',
    dayOfWeek: 4,
    order: 4,
    exercises: [
      {
        name: 'Desenvolvimento com halteres',
        order: 1, setsTarget: 4, repsMin: 8, repsMax: 12, restSeconds: 150,
        youtubeUrl: 'https://www.youtube.com/results?search_query=desenvolvimento+halteres+execucao',
        notes: 'Principal estímulo de deltoide anterior e lateral.',
        muscleLoads: [
          { muscle: 'front_delt', loadFactor: 1.0 },
          { muscle: 'side_delt', loadFactor: 0.7 },
          { muscle: 'triceps', loadFactor: 0.3 },
          { muscle: 'upper_back', loadFactor: 0.2 },
        ],
      },
      {
        name: 'Elevação lateral com halteres',
        order: 2, setsTarget: 4, repsMin: 10, repsMax: 15, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=elevacao+lateral+halteres+execucao',
        notes: 'Dose PRINCIPAL semanal de lateral.',
        muscleLoads: [
          { muscle: 'side_delt', loadFactor: 1.0 },
          { muscle: 'front_delt', loadFactor: 0.2 },
        ],
      },
      {
        name: 'Elevação lateral na polia baixa',
        order: 3, setsTarget: 3, repsMin: 12, repsMax: 15, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=elevacao+lateral+polia+baixa+execucao',
        notes: 'Tensão constante onde o halter alivia.',
        muscleLoads: [
          { muscle: 'side_delt', loadFactor: 1.0 },
        ],
      },
      {
        name: 'Crucifixo inverso',
        order: 4, setsTarget: 3, repsMin: 12, repsMax: 15, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=crucifixo+inverso+execucao',
        notes: 'Deltoide posterior.',
        muscleLoads: [
          { muscle: 'rear_delt', loadFactor: 1.0 },
          { muscle: 'mid_back', loadFactor: 0.3 },
        ],
      },
      {
        name: 'Rosca scott com halteres',
        order: 5, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 90,
        youtubeUrl: 'https://www.youtube.com/results?search_query=rosca+scott+halteres+execucao',
        notes: 'Segunda dose de bíceps. Posição alongada.',
        muscleLoads: [
          { muscle: 'biceps', loadFactor: 1.0 },
          { muscle: 'forearm', loadFactor: 0.2 },
        ],
      },
      {
        name: 'Tríceps na polia alta',
        order: 6, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=triceps+polia+alta+execucao',
        notes: 'Segunda dose de tríceps. Cotovelos fixos.',
        muscleLoads: [
          { muscle: 'triceps', loadFactor: 1.0 },
        ],
      },
      {
        name: 'Encolhimento de ombros com halteres',
        order: 7, setsTarget: 3, repsMin: 12, repsMax: 15, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=encolhimento+ombros+halteres+execucao',
        notes: 'Trapézio superior.',
        muscleLoads: [
          { muscle: 'upper_back', loadFactor: 1.0 },
        ],
      },
    ],
  },
  {
    code: 'E',
    name: 'Pernas (posterior) + Core',
    dayOfWeek: 5,
    order: 5,
    exercises: [
      {
        name: 'Levantamento terra romeno',
        order: 1, setsTarget: 4, repsMin: 8, repsMax: 10, restSeconds: 180,
        youtubeUrl: 'https://www.youtube.com/results?search_query=levantamento+terra+romeno+execucao',
        notes: 'Quadril para trás, coluna neutra. Melhor para posterior de coxa.',
        muscleLoads: [
          { muscle: 'hamstrings', loadFactor: 1.0 },
          { muscle: 'glutes', loadFactor: 0.7 },
          { muscle: 'lower_back', loadFactor: 0.5 },
        ],
      },
      {
        name: 'Mesa flexora',
        order: 2, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 90,
        youtubeUrl: 'https://www.youtube.com/results?search_query=mesa+flexora+execucao',
        notes: 'Isolamento. Contração forte no topo.',
        muscleLoads: [
          { muscle: 'hamstrings', loadFactor: 1.0 },
        ],
      },
      {
        name: 'Cadeira flexora',
        order: 3, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 90,
        youtubeUrl: 'https://www.youtube.com/results?search_query=cadeira+flexora+execucao',
        notes: 'Ângulo diferente da mesa — ativa fibras diferentes.',
        muscleLoads: [
          { muscle: 'hamstrings', loadFactor: 0.9 },
        ],
      },
      {
        name: 'Hip thrust com barra',
        order: 4, setsTarget: 3, repsMin: 10, repsMax: 12, restSeconds: 120,
        youtubeUrl: 'https://www.youtube.com/results?search_query=hip+thrust+barra+execucao',
        notes: 'Melhor exercício isolado para glúteo.',
        muscleLoads: [
          { muscle: 'glutes', loadFactor: 1.0 },
          { muscle: 'hamstrings', loadFactor: 0.3 },
        ],
      },
      {
        name: 'Panturrilha sentado',
        order: 5, setsTarget: 4, repsMin: 12, repsMax: 15, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=panturrilha+sentado+execucao',
        notes: 'Foco no sóleo.',
        muscleLoads: [
          { muscle: 'calves_soleus', loadFactor: 1.0 },
          { muscle: 'calves_gastro', loadFactor: 0.3 },
        ],
      },
      {
        name: 'Prancha frontal',
        order: 6, setsTarget: 3, repsMin: 30, repsMax: 60, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=prancha+frontal+execucao',
        notes: 'Core estático. 30-60 segundos.',
        muscleLoads: [
          { muscle: 'abs', loadFactor: 1.0 },
          { muscle: 'lower_back', loadFactor: 0.4 },
        ],
      },
      {
        name: 'Abdominal na polia',
        order: 7, setsTarget: 3, repsMin: 12, repsMax: 15, restSeconds: 60,
        youtubeUrl: 'https://www.youtube.com/results?search_query=abdominal+polia+execucao',
        notes: 'Abdominal com carga progressiva.',
        muscleLoads: [
          { muscle: 'abs', loadFactor: 1.0 },
          { muscle: 'obliques', loadFactor: 0.3 },
        ],
      },
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  const user = await prisma.user.upsert({
    where: { id: 'user_default' },
    update: {},
    create: {
      id: 'user_default',
      name: 'Felipe',
      heightCm: 175,
    },
  });
  console.log(`User: ${user.name}`);

  for (const w of workouts) {
    const workout = await prisma.workout.upsert({
      where: { code: w.code },
      update: { name: w.name, dayOfWeek: w.dayOfWeek, order: w.order },
      create: { code: w.code, name: w.name, dayOfWeek: w.dayOfWeek, order: w.order },
    });

    for (const e of w.exercises) {
      const existing = await prisma.exercise.findFirst({
        where: { workoutId: workout.id, order: e.order },
      });

      let exercise;
      if (existing) {
        exercise = await prisma.exercise.update({
          where: { id: existing.id },
          data: {
            name: e.name,
            setsTarget: e.setsTarget,
            repsMin: e.repsMin,
            repsMax: e.repsMax,
            restSeconds: e.restSeconds,
            youtubeUrl: e.youtubeUrl,
            notes: e.notes,
          },
        });
      } else {
        exercise = await prisma.exercise.create({
          data: {
            workoutId: workout.id,
            name: e.name,
            order: e.order,
            setsTarget: e.setsTarget,
            repsMin: e.repsMin,
            repsMax: e.repsMax,
            restSeconds: e.restSeconds,
            youtubeUrl: e.youtubeUrl,
            notes: e.notes,
          },
        });
      }

      await prisma.muscleLoad.deleteMany({ where: { exerciseId: exercise.id } });
      await prisma.muscleLoad.createMany({
        data: e.muscleLoads.map((ml) => ({
          exerciseId: exercise.id,
          muscle: ml.muscle,
          loadFactor: ml.loadFactor,
        })),
      });
    }

    console.log(`Workout ${w.code}: ${w.name} (${w.exercises.length} exercises)`);
  }

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
