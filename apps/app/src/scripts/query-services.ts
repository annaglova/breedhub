import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from monorepo root
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function queryServices() {
  console.log('Виконання запитів до Supabase...\n');

  // 1. Отримати всі активні сервіси
  console.log('1. Активні сервіси (status_id = "9a32e65f-7d52-49ac-aef5-836a9a01f14e"):');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  
  const { data: services, error: servicesError } = await supabase
    .from('service_item')
    .select('id, name, description, color')
    .eq('status_id', '9a32e65f-7d52-49ac-aef5-836a9a01f14e');

  if (servicesError) {
    console.error('Помилка при отриманні сервісів:', servicesError);
    return;
  }

  if (services && services.length > 0) {
    console.table(services);
    console.log(`\nЗнайдено сервісів: ${services.length}`);
    
    // Отримати ID всіх сервісів для наступного запиту
    const serviceIds = services.map(s => s.id);
    
    // 2. Отримати conf_items пов'язані з цими сервісами
    console.log('\n2. Conf_items пов\'язані з активними сервісами:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    const { data: confItems, error: confItemsError } = await supabase
      .from('conf_item')
      .select(`
        id,
        name,
        description,
        icon,
        service_in_conf_item!inner(service_item_id)
      `)
      .in('service_in_conf_item.service_item_id', serviceIds);

    if (confItemsError) {
      console.error('Помилка при отриманні conf_items:', confItemsError);
      return;
    }

    if (confItems && confItems.length > 0) {
      // Форматуємо дані для таблиці
      const formattedConfItems = confItems.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        icon: item.icon
      }));
      
      console.table(formattedConfItems);
      console.log(`\nЗнайдено conf_items: ${confItems.length}`);
      
      // Додатковий аналіз: показати які conf_items пов'язані з якими сервісами
      console.log('\n3. Зв\'язки між сервісами та conf_items:');
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      
      const { data: relationships, error: relError } = await supabase
        .from('service_in_conf_item')
        .select(`
          service_item!inner(id, name),
          conf_item!inner(id, name)
        `)
        .in('service_item_id', serviceIds);
      
      if (relError) {
        console.error('Помилка при отриманні зв\'язків:', relError);
      } else if (relationships) {
        const formattedRel = relationships.map(rel => ({
          'Service ID': rel.service_item.id,
          'Service Name': rel.service_item.name,
          'Conf Item ID': rel.conf_item.id,
          'Conf Item Name': rel.conf_item.name
        }));
        console.table(formattedRel);
      }
    } else {
      console.log('Не знайдено жодного conf_item для активних сервісів');
    }
  } else {
    console.log('Не знайдено жодного активного сервісу з вказаним status_id');
  }
}

// Виконати запити
queryServices().catch(console.error);