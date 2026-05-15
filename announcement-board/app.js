import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;
const PER_PAGE = 10;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.set('view engine', 'ejs');

const categoryMap = {
  sale: '📦 Продаж',
  service: '🔧 Послуги',
  job: '💼 Робота',
  other: '📌 Інше',
};

function validateAnnouncement(data) {
  const errors = {};

  const {
    title,
    description,
    price,
    category,
    contactInfo,
  } = data;

  const validCategories = ['sale', 'service', 'job', 'other'];

  if (!title || title.trim().length < 5) {
    errors.title = 'Назва має бути не менше 5 символів';
  }

  if (title && title.trim().length > 100) {
    errors.title = 'Назва має бути не більше 100 символів';
  }

  if (!description || description.trim().length < 10) {
    errors.description = 'Опис має бути не менше 10 символів';
  }

  if (!validCategories.includes(category)) {
    errors.category = 'Оберіть категорію';
  }

  if (!price || isNaN(price) || Number(price) <= 0) {
    errors.price = 'Ціна має бути додатним числом';
  }

  if (!contactInfo || contactInfo.trim().length < 5) {
    errors.contactInfo =
      'Контактна інформація має бути не менше 5 символів';
  }

  return errors;
}

app.get('/', async (req, res, next) => {
  try {
    const {
      search = '',
      sort = 'newest',
      page = '1',
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);

    const where = {};

    if (search.trim()) {
      where.title = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    let orderBy = {
      createdAt: 'desc',
    };

    if (sort === 'oldest') {
      orderBy = {
        createdAt: 'asc',
      };
    }

    const skip = (currentPage - 1) * PER_PAGE;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy,
        skip,
        take: PER_PAGE,
      }),

      prisma.announcement.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / PER_PAGE);

    res.render('index', {
      announcements,
      search,
      sort,
      currentPage,
      totalPages,
      total,
      categoryMap,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/announcements', (req, res) => {
  res.render('new', {
    errors: {},
    data: {},
  });
});

app.post('/announcements', async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      category,
      contactInfo,
    } = req.body;

    const errors = validateAnnouncement(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).render('new', {
        errors,
        data: req.body,
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        contactInfo: contactInfo.trim(),
      },
    });

    res.redirect(`/announcements/${announcement.id}`);
  } catch (error) {
    next(error);
  }
});

app.get('/announcements/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(404).render('404', {
        message: 'Оголошення не знайдено',
      });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return res.status(404).render('404', {
        message: 'Оголошення не знайдено',
      });
    }

    res.render('announcement', {
      announcement,
      categoryMap,
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/announcements/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(404).end();
    }

    await prisma.announcement.delete({
      where: { id },
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).render('404', {
    message: 'Сторінку не знайдено',
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).render('error', {
    error: process.env.NODE_ENV === 'development'
      ? err
      : null,
  });
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});