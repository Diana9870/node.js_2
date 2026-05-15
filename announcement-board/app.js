import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.set('view engine', 'ejs');

app.get('/', async (req, res, next) => {
  try {
    const { search = '', sort = 'newest', page = 1 } = req.query;

    const pageNum = Number(page);
    const perPage = 10;

    const where = {};

    if (search.trim()) {
      where.title = {
        contains: search
      };
    }

    let orderBy = {
      createdAt: 'desc'
    };

    if (sort === 'oldest') {
      orderBy = {
        createdAt: 'asc'
      };
    }

    const total = await prisma.announcement.count({
      where
    });

    const totalPages = Math.ceil(total / perPage);

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy,
      skip: (pageNum - 1) * perPage,
      take: perPage
    });

    res.render('index', {
      announcements,
      search,
      sort,
      currentPage: pageNum,
      totalPages
    });

  } catch (error) {
    next(error);
  }
});

app.get('/announcements', (req, res) => {
  res.render('new', {
    errors: {},
    data: {}
  });
});

app.get('/announcements/:id', async (req, res, next) => {
  const id = Number(req.params.id);

  const announcement = await prisma.announcement.findUnique({
    where: { id }
  });

  if (!announcement) {
    return res.status(404).render('404');
  }

  res.render('announcement', { announcement });

  try {

    const {
      title,
      description,
      price,
      category,
      contactInfo
    } = req.body;

    const errors = {};

    if (!title || title.trim().length < 5) {
      errors.title = 'Назва має бути не менше 5 символів';
    }

    if (!description || description.trim().length < 10) {
      errors.description = 'Опис має бути не менше 10 символів';
    }

    const validCategories = ['sale', 'service', 'job', 'other'];

    if (!validCategories.includes(category)) {
      errors.category = 'Оберіть категорію';
    }

    if (!price || isNaN(price) || Number(price) <= 0) {
      errors.price = 'Ціна має бути додатним числом';
    }

    if (!contactInfo || contactInfo.trim().length < 5) {
      errors.contactInfo = 'Контакти мають бути не менше 5 символів';
    }

    if (Object.keys(errors).length > 0) {
      return res.render('new', {
        errors,
        data: req.body
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        contactInfo: contactInfo.trim()
      }
    });

    res.redirect(`/announcements/${announcement.id}`);

  } catch (error) {
    next(error);
  }
});

app.get('/announcements/:id', async (req, res, next) => {
  try {

    const id = Number(req.params.id);

    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return res.status(404).render('404', {
        message: 'Оголошення не знайдено'
      });
    }

    res.render('announcement', {
      announcement
    });

  } catch (error) {
    next(error);
  }
});

app.delete('/announcements/:id', async (req, res, next) => {
  try {

    const id = Number(req.params.id);

    await prisma.announcement.delete({
      where: { id }
    });

    res.status(204).end();

  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).render('404', {
    message: 'Сторінку не знайдено'
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).render('error');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});